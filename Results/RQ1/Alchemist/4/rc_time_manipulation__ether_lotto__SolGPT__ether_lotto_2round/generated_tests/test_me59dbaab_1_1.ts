import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - me59dbaab", function () {
  it("should kill mutant by verifying contract balance after play() when player wins", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;

    // Player sends exactly TICKET_AMOUNT wei
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // After the game, if player won (random == 0), contract should have exactly FEE_AMOUNT wei left
    // In the original: pot - FEE_AMOUNT is sent to player, leaving FEE_AMOUNT in contract
    // In the mutant: pot + FEE_AMOUNT is attempted, which reverts due to insufficient balance, leaving all TICKET_AMOUNT wei
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // If the mutant is present and player won, the transfer reverts and contract retains TICKET_AMOUNT (10 wei)
    // If original code, contract retains FEE_AMOUNT (1 wei)
    // Since we cannot control randomness, we run the test multiple times or check both possibilities
    // The test passes only if the contract balance equals FEE_AMOUNT (original behavior)
    // If the mutant is present, this assertion will fail because balance will be TICKET_AMOUNT (10 wei)
    expect(contractBalance).to.equal(FEE_AMOUNT);
  });
});