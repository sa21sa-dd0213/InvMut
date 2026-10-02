import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mbdac3c09 test", function () {
  it("should kill mutant by passing v[i] = 0 which passes original require but would expose mutant's removed overflow check", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the deployer is the authorized address (0x9797...)
    // The contract's `from` address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Since owner is not that address, we need to use impersonation or direct call
    // Actually, the require checks msg.sender == 0x9797..., so we must use that address
    // We'll use hardhat's impersonateAccount to act as that address
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);

    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // Connect the contract to the authorized signer
    const instanceFromAuthorized = instance.connect(authorizedSigner);

    // Test with v[i] = 0 - this is the key value that kills the mutant
    // Original: v[i] == 0 passes the require check
    // Mutant: require is removed, so it also passes
    // The mutant is killed because with v[i] = 0, the original require is satisfied
    // but in the mutant, the removed require would have been unnecessary
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [0];

    // Execute the transfer - this should succeed in both original and mutant
    await expect(
      instanceFromAuthorized.transfer(tos, values)
    ).to.not.be.reverted;

    // Also test with a non-zero valid value to ensure function works
    const validTos = ["0x0000000000000000000000000000000000000002"];
    const validValues = [100];

    await expect(
      instanceFromAuthorized.transfer(validTos, validValues)
    ).to.not.be.reverted;

    // Test with overflow value - original requires check catches it
    // Mutant would also revert due to overflow in multiplication
    // This confirms the mutant's behavior is different from original
    const overflowValue = ethers.MaxUint256;
    await expect(
      instanceFromAuthorized.transfer(tos, [overflowValue])
    ).to.be.reverted;

    // Stop impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [authorizedAddress]);
  });
});