import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant detection - division instead of subtraction", function () {
  it("should kill the mutant by verifying player receives pot - FEE_AMOUNT and contract balance is zero", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Player plays the game
    const playTx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await playTx.wait();
    
    // Check that the contract balance is zero (fee sent to bank, rest to player)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0n);
    
    // Check that the player received pot - FEE_AMOUNT
    const playerBalance = await ethers.provider.getBalance(player.address);
    const expectedPlayerBalance = ethers.parseEther("10000") + TICKET_AMOUNT - FEE_AMOUNT; // initial 10000 + winnings
    expect(playerBalance).to.equal(expectedPlayerBalance);
  });
});