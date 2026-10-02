import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m89187fec", function () {
  it("should kill the mutant by verifying bank receives exactly 1 wei fee after a win", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Record bank balance before play
    const bankBefore = await ethers.provider.getBalance(owner.address);
    
    // Player calls play with exactly 10 wei
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();
    
    // Check bank balance after play
    const bankAfter = await ethers.provider.getBalance(owner.address);
    
    // In the original, bank receives exactly 1 wei fee
    // In the mutant, the transfer to player uses division (pot / 1 = pot),
    // so the contract would have insufficient balance to pay the bank,
    // causing a revert or the bank balance not increasing by exactly 1 wei
    expect(bankAfter - bankBefore).to.equal(FEE_AMOUNT);
  });
});