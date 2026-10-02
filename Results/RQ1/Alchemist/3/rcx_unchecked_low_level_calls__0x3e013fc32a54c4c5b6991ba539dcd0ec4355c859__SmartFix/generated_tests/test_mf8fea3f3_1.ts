import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - mf8fea3f3", function () {
  it("should detect arithmetic mutation (addition changed to subtraction) in multiplicate function", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for MultiplicatorX4)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance (e.g., 5 ETH) via receive function
    const initialFunding = ethers.parseEther("5");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });
    
    // Verify initial balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(initialFunding);
    
    // Prepare attack: send msg.value equal to current contract balance
    const attackValue = ethers.parseEther("5");
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
    
    // Call multiplicate - original would send balance+msg.value (10 ETH)
    // Mutant would send balance-msg.value (0 ETH)
    const tx = await instance.connect(owner).multiplicate(recipient.address, { value: attackValue });
    await tx.wait();
    
    // Check recipient balance - if mutant is live, recipient gets 0 ETH (no change)
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
    const balanceChange = recipientBalanceAfter - recipientBalanceBefore;
    
    // In original: balanceChange should be ~10 ETH (5 initial + 5 sent)
    // In mutant: balanceChange should be ~0 ETH (5 initial - 5 sent = 0)
    // The test expects the original behavior (addition)
    expect(balanceChange).to.equal(ethers.parseEther("10"));
  });
});