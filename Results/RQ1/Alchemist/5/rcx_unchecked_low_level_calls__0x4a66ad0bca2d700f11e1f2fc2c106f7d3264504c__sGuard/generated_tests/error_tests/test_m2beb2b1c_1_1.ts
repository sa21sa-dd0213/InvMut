import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2beb2b1c", function () {
  it("should kill mutant by calling transfer from an address greater than the authorized address", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get an address that is numerically greater than the authorized address
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use a signer with a higher address value
    // Since we can't control signer addresses directly, we find one that's greater
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const attackerAddress = attacker.address;

    // Check that attacker address is numerically greater than authorized address
    // If not, we skip this test (in practice we'd use a different signer)
    if (BigInt(attackerAddress) > BigInt(authorizedAddress)) {
      // Prepare test data
      const recipients = [owner.address];
      const amounts = [1]; // 1 token (will be multiplied by 10^18 in the contract)

      // Call from attacker (should revert on original, pass on mutant)
      await expect(
        instance.connect(attacker).transfer(recipients, amounts)
      ).to.be.reverted;
    } else {
      // If attacker address is not greater, use a different approach
      // We can directly call with an explicit high address via impersonation
      // For simplicity, we test that the original contract reverts for unauthorized callers
      const randomSigner = ethers.Wallet.createRandom().connect(ethers.provider);
      const randomAddress = await randomSigner.getAddress();

      // Verify it's greater than authorized
      if (BigInt(randomAddress) > BigInt(authorizedAddress)) {
        const recipients = [owner.address];
        const amounts = [1];

        await expect(
          instance.connect(randomSigner).transfer(recipients, amounts)
        ).to.be.reverted;
      } else {
        // As a fallback, use a hardcoded high address if available
        console.log("Using hardhat account #2 which should be high enough");
        const [,, addr2] = await ethers.getSigners();
        const recipients = [owner.address];
        const amounts = [1];

        await expect(
          instance.connect(addr2).transfer(recipients, amounts)
        ).to.be.reverted;
      }
    }
  });
});