import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Reentrance mutant mdc338dca test", function () {
  it("should revert and keep balance when withdrawal to rejecting contract fails", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a receiver contract that rejects Ether
    const ReceiverFactory = await ethers.getContractFactory("RejectingReceiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();
    const receiverAddress = await receiver.getAddress();

    // Fund the Reentrance contract with some ETH from owner
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Fund the receiver address balance in Reentrance contract
    // First send ETH from receiver to addToBalance
    const fundingAmount = ethers.parseEther("0.5");
    await owner.sendTransaction({
      to: instanceAddress,
      value: fundingAmount
    });
    // Actually add balance to receiver address by having owner call addToBalance with receiver as msg.sender? No - let's directly set balance via the mapping is not possible externally.
    // Instead, we need the receiver contract to call addToBalance. But receiver rejects Ether. So we can use a different approach:
    // Have the attacker send ETH to the Reentrance contract, then transfer ownership of that balance to the receiver address? Not possible.
    // Correct approach: We'll have the receiver contract itself send ETH to addToBalance by using a helper that accepts then forwards.
    // But receiver rejects incoming calls. So instead, we can just have the attacker deposit for the receiver address by calling addToBalance with value from attacker.
    // Wait - addToBalance uses msg.sender, so only the address itself can deposit. 
    // We need to create a balance for the receiver contract address in the Reentrance contract.
    // We'll deploy a different helper contract that can receive ETH and then call addToBalance on Reentrance.
    const HelperFactory = await ethers.getContractFactory("Helper");
    const helper = await HelperFactory.deploy(instanceAddress);
    await helper.waitForDeployment();
    
    // Send ETH to helper, which then calls addToBalance
    await owner.sendTransaction({
      to: await helper.getAddress(),
      value: fundingAmount
    });
    
    // Now the receiver address should have a balance in Reentrance? No - the helper deposited for itself.
    // Let's rethink: We need the receiver contract address to have a balance in Reentrance.
    // The simplest way: deploy the receiver, then have the owner call addToBalance directly but using the receiver as msg.sender? Not possible without private key.
    // Instead, we can have the receiver contract implement a function that accepts ETH and then calls addToBalance on Reentrance with itself as msg.sender.
    // But receiver rejects all incoming ETH. So we cannot fund it.
    
    // Alternative: We'll create a different test scenario:
    // Use the owner's own balance, then have owner withdraw to the rejecting receiver address via a malicious contract.
    // Actually, the simplest valid test: 
    // 1. Deploy a "Victim" contract that can receive ETH and then call withdrawBalance on Reentrance.
    // 2. Fund the Victim contract's balance in Reentrance.
    // 3. Have Victim call withdrawBalance, which sends ETH to Victim (which then reverts the receive).
    // But Victim must be the one calling withdrawBalance for msg.sender to be Victim.
    
    // Let's use a simpler approach: deploy the receiver contract, send ETH directly to the Reentrance contract to give it balance, 
    // then have the receiver contract (as msg.sender) call withdrawBalance. But the receiver needs to initiate the call.
    // We'll create a test contract that can be triggered.
    
    // Given time constraints, the simplest valid test that exercises the mutant:
    // We'll use the owner's address as the withdrawer, and have the owner call withdrawBalance while the Reentrance contract 
    // sends ETH to a contract that reverts on receive. But owner is an EOA, not a contract, so the call won't fail.
    
    // Correct approach: Deploy a malicious contract that:
    // - Has a balance in Reentrance (by having it call addToBalance with ETH)
    // - Calls withdrawBalance, which triggers a call to the malicious contract's receive function
    // - The receive function reverts, causing the withdrawal to fail
    
    // Let's deploy a proper test contract
    const TestContractFactory = await ethers.getContractFactory("TestWithdrawReverter");
    const testContract = await TestContractFactory.deploy(instanceAddress);
    await testContract.waitForDeployment();
    
    // Fund the test contract's balance in Reentrance
    await owner.sendTransaction({
      to: await testContract.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Now testContract has ETH, but it needs to call addToBalance to register its balance in Reentrance
    await testContract.deposit({ value: ethers.parseEther("0.5") });
    
    // Verify balance was recorded
    const balanceBefore = await instance.getBalance(await testContract.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("0.5"));
    
    // Now call withdrawBalance - this should revert in original, but in mutant it will zero the balance
    await testContract.triggerWithdraw();
    
    // In the original, this would revert, so balance would still be 0.5
    // In the mutant, the balance is zeroed even though the call failed
    const balanceAfter = await instance.getBalance(await testContract.getAddress());
    
    // The test kills the mutant if balanceAfter is 0 (mutant zeros it) vs original keeps it
    // We expect the original behavior: balance should remain non-zero
    expect(balanceAfter).to.equal(ethers.parseEther("0.5"));
  });
});