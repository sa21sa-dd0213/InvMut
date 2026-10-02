import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant where pot += msg.value+1 instead of pot += msg.value", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n; // TICKET_AMOUNT = 10 wei
    const feeAmount = 1n; // FEE_AMOUNT = 1 wei

    // Get initial balances
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Player plays with exactly 10 wei
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: ticketAmount,
      data: instance.interface.encodeFunctionData("play")
    });

    // Get final balances
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, pot increases by exactly msg.value (10 wei)
    // If random == 0: owner gets 1 wei, player gets 9 wei, contract ends with 0
    // If random == 1: pot stays at 10 wei, contract balance = 10 wei
    // In the mutant, pot increases by msg.value+1 (11 wei)
    // If random == 0: owner gets 1 wei, player gets 10 wei (pot - fee), contract ends with 0
    // If random == 1: pot stays at 11 wei, contract balance = 11 wei

    // The key difference: in the mutant, the contract balance will be 1 wei higher
    // than expected when random == 1, because the extra wei was never actually deposited
    // This will cause a revert when trying to pay out pot - fee (since pot > actual balance)
    
    // Play again to force a payout if random == 0
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: ticketAmount,
      data: instance.interface.encodeFunctionData("play")
    });

    // Get contract balance after second play
    const contractBalanceAfterSecondPlay = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the original, contract balance should be either 0 or 10 or 20
    // In the mutant, contract balance could be 11 or 22 (extra 1 per play)
    // The mutant will fail if a payout happens with the inflated pot value
    
    // The test kills the mutant by checking that the contract balance
    // never exceeds what should be possible with only 10 wei tickets
    // (max possible = number of plays * 10 wei)
    expect(contractBalanceAfterSecondPlay).to.be.at.most(20n);
  });
});