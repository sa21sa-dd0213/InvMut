import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m43682e14 test", function () {
  it("should revert when calling transfer with a non-empty array (mutant changes > to <)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the hardcoded from address
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the hardcoded address
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const fromSigner = await ethers.getSigner(fromAddress);
    
    // Fund the fromAddress with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test data: non-empty array of recipients and values
    const recipients = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [ethers.parseEther("0.1")];
    
    // Connect as the fromSigner and call transfer
    const instanceConnected = instance.connect(fromSigner);
    
    // The original requires _tos.length > 0 (passes with 1 element)
    // The mutant requires _tos.length < 0 (always fails since length >= 0)
    // So the mutant should always revert
    await expect(
      instanceConnected.transfer(recipients, values)
    ).to.be.reverted;
    
    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
  });
});