import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m455640cf", function () {
  it("should kill mutant by verifying tokens are transferred from the correct 'from' address, not from address(0)", async function () {
    // Get signers
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test scenario: Call transfer with valid parameters
    const tos = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)

    // Impersonate the from address
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const impersonatedSigner = await ethers.getSigner(fromAddress);

    // Fund the impersonated account
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1")
    });

    // Call transfer
    const tx = await instance.connect(impersonatedSigner).transfer(tos, amounts);
    await tx.wait();

    // Check the from address after deployment
    const fromAfterDeploy = await instance.from();

    // The mutant changes from to address(0), so we verify it's not zero
    expect(fromAfterDeploy).to.not.equal(
      ethers.ZeroAddress,
      "Mutant killed: from address should not be zero address in original contract"
    );

    // Additional verification: The original from address should be set correctly
    if (fromAfterDeploy === ethers.ZeroAddress) {
      // This is the mutant - the test fails (kills the mutant)
      expect.fail("Mutant detected: from address is zero address");
    }

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
  });
});