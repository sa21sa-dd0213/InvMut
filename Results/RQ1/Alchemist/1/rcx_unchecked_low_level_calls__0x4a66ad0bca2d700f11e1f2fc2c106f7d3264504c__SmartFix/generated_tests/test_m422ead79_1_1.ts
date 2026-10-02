import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test", function () {
  it("should kill mutant m422ead79 by passing v[i] = 0 to the transfer function", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: _tos with one address, v with value 0
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const _tos = [fromAddress]; // Use the from address as recipient for simplicity
    const v = [0];

    // Impersonate the hardcoded from address
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const signer = await ethers.getSigner(fromAddress);

    // Fund the impersonated account with some ETH (for gas)
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Connect the impersonated account to the contract
    const contractAsSigner = instance.connect(signer);

    // Call transfer with v[i] = 0 - should revert because the OR condition fails
    await expect(contractAsSigner.transfer(_tos, v)).to.be.reverted;

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
  });
});