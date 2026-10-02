import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mefedbccc", function () {
  it("should revert when Collect is called but ETH transfer to a reverting recipient fails, and balance should not be deducted", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a malicious contract that reverts on receive
    const RevertingReceiver = await ethers.getContractFactory("RevertingReceiver");
    const revertingReceiver = await RevertingReceiver.deploy();
    await revertingReceiver.waitForDeployment();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Set MinSum to 0 for easier testing (optional, but we can use default 1 ether)
    // For this test we'll use sufficient ETH
    
    // Fund addr1 and put ETH into wallet with unlock time in the past
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("10")
    });
    
    // addr1 puts 5 ETH with unlock time in the past
    const currentTime = Math.floor(Date.now() / 1000);
    const pastTime = currentTime - 1000;
    
    await instance.connect(addr1).Put(pastTime, { value: ethers.parseEther("5") });
    
    // Check balance before Collect
    const holderBefore = await instance.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(ethers.parseEther("5"));
    
    // Attempt Collect with the reverting receiver as the caller
    // Note: The caller is the one who receives the ETH, so we need addr1 to call Collect
    // But addr1 is a normal account, not a reverting contract.
    // To test the mutant properly, we need the *recipient* of the call to revert.
    // However, Collect sends ETH to msg.sender. If msg.sender is a contract that reverts, 
    // the call will fail. So we need addr1 to be the reverting receiver contract.
    // But the contract stores balance per address, and addr1 is an EOA.
    // We can deploy a contract that impersonates addr1? No, we need the contract to be the caller.
    // Let's instead create a scenario where the contract itself calls Collect, but the contract's receive reverts.
    
    // Actually, the simplest approach: use the reverting receiver as the caller for Collect.
    // But the mapping Acc stores balance by address. We need the revertingReceiver to have balance.
    // So let's fund revertingReceiver, have it call Put, then try Collect.
    
    // Fund revertingReceiver
    await owner.sendTransaction({
      to: await revertingReceiver.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // revertingReceiver calls Put (it has a fallback that can receive? No, we need to call it directly)
    // Since revertingReceiver is a contract, we can call Put on its behalf
    // Actually, revertingReceiver needs to be the msg.sender. We can use connect(revertingReceiver)
    // But revertingReceiver is a contract, we need an EOA signer to connect? 
    // Hardhat allows connecting contracts as signers only if they have a signer. 
    // Better approach: use impersonate or have a simple EOA send to the wallet via fallback.
    
    // Simplified approach: Use addr1 (EOA) as caller, but send ETH to a reverting contract.
    // That doesn't work because Collect sends to msg.sender.
    
    // Correct approach: Deploy a contract that calls Collect on the wallet.
    // The contract will receive the ETH and revert, testing the original vs mutant.
    
    // Let's deploy a caller contract
    const CallerContract = await ethers.getContractFactory("TestCaller");
    const caller = await CallerContract.deploy(await instance.getAddress());
    await caller.waitForDeployment();
    
    // Fund the caller contract
    await owner.sendTransaction({
      to: await caller.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Caller puts ETH into wallet with past unlock time
    await caller.connect(owner).putFunds(pastTime, ethers.parseEther("5"));
    
    // Check balance
    const callerBefore = await instance.Acc(await caller.getAddress());
    expect(callerBefore.balance).to.equal(ethers.parseEther("5"));
    
    // Now caller attempts to collect - its receive function will revert
    // This should fail in the original (balance not deducted) but succeed in mutant (balance deducted)
    
    await caller.connect(owner).attemptCollect(ethers.parseEther("3"));
    
    // Check if balance was incorrectly deducted (mutant behavior)
    const callerAfter = await instance.Acc(await caller.getAddress());
    
    // In original: balance should remain 5 because call reverted
    // In mutant: balance should be 2 because it ignored the revert
    expect(callerAfter.balance).to.equal(ethers.parseEther("5"), 
      "Balance should remain unchanged because the ETH transfer to a reverting contract should have failed");
  });
});

// Helper contracts for testing
// Note: These need to be in separate files or inline. For this test we assume they're deployed separately.
// We'll use inline contract definitions via hardhat.