import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m646bbd22", function () {
  it("should kill mutant by calling transfer with valid params expecting success on original, but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU - no constructor arguments needed
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The contract's hardcoded from address
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // We need to impersonate the from address since require(msg.sender == fromAddress)
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const fromSigner = await ethers.getSigner(fromAddress);
    
    // Fund the from account with ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Use a valid recipient address and amount
    const recipients = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1]; // 1 token * 10^18 = 1e18 wei
    
    // The call to caddress will fail (caddress is a random address with no contract)
    // But the ORIGINAL contract will NOT revert because it only reverts on failed calls
    // The MUTANT will ALWAYS revert because it has "if (true) { revert(); }"
    
    // On the original: this should NOT revert (the call fails but !_s is false so no revert)
    // On the mutant: this WILL revert (because if(true) always triggers revert)
    
    await expect(
      instance.connect(fromSigner).transfer(recipients, amounts)
    ).to.not.be.reverted;
    
    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
  });
});