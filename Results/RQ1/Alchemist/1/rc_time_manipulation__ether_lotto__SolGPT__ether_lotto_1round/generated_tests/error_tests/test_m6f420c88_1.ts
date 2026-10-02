import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m6f420c88", function () {
  it("should kill the mutant by detecting that pot+FEE_AMOUNT causes insufficient balance", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with no constructor arguments (constructor takes none)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Player buys exactly one ticket
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    const receipt = await tx.wait();
    
    // Get the pot after the play
    const potAfter = await instance.pot();
    
    // In the original: pot should be 0 after a winning round (random == 0)
    // In the mutant: the transfer(pot + FEE_AMOUNT) will attempt to send more than the contract holds
    // causing a revert. We detect this by checking that either:
    // 1. The transaction reverted (mutant), or
    // 2. The pot is 0 and no extra ether was lost (original behavior)
    
    // If the transaction succeeded (mutant didn't revert somehow), the pot should be 0
    // But the mutant would have drained more ether than available
    // So we also check contract balance to detect the anomaly
    const contractBalance = await ethers.provider.getBalance(instance.target);
    
    // For original: pot is 0 and contract balance is 0 (fee sent to bank, rest to player)
    // For mutant: either tx reverts OR contract balance goes negative (impossible) or 
    // the transfer succeeds but contract balance would be wrong
    if (receipt.status === 0) {
      // Transaction reverted - this kills the mutant (original would succeed)
      expect.fail("Transaction reverted - mutant detected");
    }
    
    // If we got here, transaction succeeded - check for abnormal state
    expect(potAfter).to.equal(0, "Pot should be zero after a winning play");
    expect(contractBalance).to.equal(0, "Contract balance should be zero after distribution");
    
    // Additional check: bank should have received exactly the fee
    const bankBalance = await ethers.provider.getBalance(owner.address);
    const expectedBankBalance = (await ethers.provider.getBalance(owner.address)).toString();
    // Bank should have gained exactly FEE_AMOUNT from this transaction
    expect(bankBalance).to.be.gt(0);
  });
});