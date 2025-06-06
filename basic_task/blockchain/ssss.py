import random

def split_secret(secret, total_shares, needed_shares, prime=2**127-1):
    """Split a secret into shares using a polynomial curve"""
    if needed_shares > total_shares:
        raise ValueError("You can't need more shares than you create!")
    
    # Create random polynomial (secret is the y-intercept)
    coefficients = [secret] + [random.randint(1, prime-1) for _ in range(needed_shares-1)]
    
    # Generate shares (points on the curve)
    shares = []
    for x in range(1, total_shares+1):
        y = sum(coeff * (x**power) for power, coeff in enumerate(coefficients)) % prime
        shares.append((x, y))
    return shares, prime

def reconstruct_secret(shares, prime):
    """Rebuild the secret using Lagrange interpolation"""
    secret = 0
    for i, (xi, yi) in enumerate(shares):
        # Calculate Lagrange basis polynomial
        numerator = denominator = 1
        for j, (xj, _) in enumerate(shares):
            if i != j:
                numerator *= -xj
                denominator *= (xi - xj)
        # Add the term to the secret
        term = yi * numerator * pow(denominator, -1, prime)
        secret += term
    return secret % prime

def get_number_input(prompt, min_value=1):
    """Get a valid number from user"""
    while True:
        try:
            value = int(input(prompt))
            if value >= min_value:
                return value
            print(f"Please enter a number ≥ {min_value}")
        except ValueError:
            print("Please enter a valid number!")

def main():
    print("🔐 Shamir's Secret Sharing Tool 🔐")
    print("(Split a secret number into secure shares)\n")
    
    # Get user inputs
    secret = get_number_input("Enter your secret number: ")
    total_shares = get_number_input("Total number of shares to create: ")
    needed_shares = get_number_input("Minimum shares needed to reconstruct: ", min_value=2)
    
    if needed_shares > total_shares:
        print("\n❌ Error: You can't need more shares than you create!")
        return
    
    # Split the secret
    shares, prime = split_secret(secret, total_shares, needed_shares)
    
    print("\n✅ Shares created successfully!")
    print(f"Original secret: {secret}")
    print(f"Prime number used: {prime}\n")
    print("Your shares (give each to a different person):")
    for i, (x, y) in enumerate(shares, 1):
        print(f"Share {i}: (x={x}, y={y})")
    
    # Reconstruction demo
    print("\n🔍 Let's test reconstruction!")
    use_shares = min(needed_shares, total_shares)  # Don't ask for more than exists
    print(f"Enter {use_shares} shares to reconstruct the secret...")
    
    test_shares = []
    for i in range(use_shares):
        while True:
            try:
                x = int(input(f"  Share {i+1} - Enter x value: "))
                y = int(input(f"         Enter y value: "))
                test_shares.append((x, y))
                break
            except ValueError:
                print("Please enter valid numbers!")
    
    # Reconstruct and verify
    recovered = reconstruct_secret(test_shares, prime)
    print(f"\nRecovered secret: {recovered}")
    print("✅ Success!" if recovered == secret else "❌ Failed - wrong shares entered")

if __name__ == "__main__":
    main()
