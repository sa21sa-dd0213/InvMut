import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant test - require removed in withdraw", function () {
  it("should revert when a contract that rejects ether tries to withdraw, but mutant loses funds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the main contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a receiver contract that rejects ether
    const ReceiverFactory = await ethers.getContractFactory("RejectEther");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();
    
    // Send ether to the contract from the receiver address
    const depositAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Verify balance was recorded
    expect(await instance.balances(owner.address)).to.equal(depositAmount);
    
    // Now try to withdraw from the receiver contract (which will reject)
    // The original would revert, the mutant would lose funds
    const receiverAsSigner = await ethers.getImpersonatedSigner(await receiver.getAddress());
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Transfer balance to receiver for testing
    await instance.connect(owner).transfer(await receiver.getAddress(), depositAmount);
    
    // Attempt withdrawal - should revert in original, but mutant may succeed
    const tx = instance.connect(receiverAsSigner).withdraw();
    
    // Check if the balance is still there (original behavior) or zero (mutant bug)
    await expect(tx).to.be.reverted;
    
    // After revert attempt, balance should still be intact in original
    expect(await instance.balances(await receiver.getAddress())).to.equal(depositAmount);
  });
});

// Helper contract that rejects ether
contract RejectEther {
  receive() external payable {
    revert("Ether not accepted");
  }
}