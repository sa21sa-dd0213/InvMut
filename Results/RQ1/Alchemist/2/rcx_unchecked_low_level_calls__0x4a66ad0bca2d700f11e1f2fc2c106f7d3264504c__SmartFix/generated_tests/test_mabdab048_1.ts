import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test mabdab048", function () {
  it("should kill mutant by passing v[i]=1 which passes original but reverts mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The from address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use an account that matches this address for msg.sender
    // Since this is a hardhat test, we need to impersonate or use the correct signer
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const fromSigner = await ethers.getSigner(fromAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Test with v[i] = 1 (original: (1 * 1e18) / 1 == 1e18 passes; mutant: (1 + 1e18) / 1 != 1e18 reverts)
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // v[i] = 1

    // On original this passes, on mutant it should revert
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});