import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - loop condition changed from < to >", function () {
  it("should detect mutant by checking recipient balance after transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments as per original code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the from address (hardcoded in contract)
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the from address to send the transaction
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress],
    });
    const fromSigner = await ethers.getSigner(fromAddress);
    
    // Fund the from account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0"),
    });
    
    // Prepare test data - one recipient with 1 token
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // Get initial balance of recipient
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Call transfer function
    const tx = await instance.connect(fromSigner).transfer(recipients, amounts);
    await tx.wait();
    
    // Check if balance increased (should have increased in original, but not in mutant)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    
    // The mutant's loop never executes, so no transfer happens
    // In original, balance would increase by 1 * 10^18 wei
    // In mutant, balance remains unchanged
    expect(finalBalance).to.equal(initialBalance);
    
    // Stop impersonating
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [fromAddress],
    });
  });
});