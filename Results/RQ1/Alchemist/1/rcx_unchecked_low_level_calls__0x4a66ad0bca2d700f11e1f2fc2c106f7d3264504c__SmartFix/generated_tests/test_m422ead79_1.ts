import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test", function () {
  it("should kill mutant m422ead79 by passing v[i] = 0 to the transfer function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: _tos with one address, v with value 0
    const _tos = [addr1.address];
    const v = [0];

    // Call transfer with msg.sender equal to the hardcoded from address
    // Since the contract uses a hardcoded from address, we need to impersonate it
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const signer = await ethers.getSigner(fromAddress);

    // Fund the impersonated account with some ETH (optional, for gas)
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Connect the impersonated account to the contract
    const contractAsSigner = instance.connect(signer);

    // On original: should succeed because v[i] == 0 makes the OR condition true
    // On mutant: should revert because v[i] != 0 is false and the second condition is false for 0
    await expect(contractAsSigner.transfer(_tos, v)).to.be.reverted;

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
  });
});