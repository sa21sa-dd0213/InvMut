import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m90b5ca14", function () {
  it("should detect mutant that adds 1 to msg.value when updating pot", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Player sends exactly TICKET_AMOUNT (10 ether) to play
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();
    
    // Check the pot after the transaction
    const potAfter = await instance.pot();
    
    // Check that pot is NOT equal to TICKET_AMOUNT + 1 wei (mutant value)
    expect(potAfter).to.not.equal(TICKET_AMOUNT + 1n);
    
    // For completeness, also check that pot is either 0 or TICKET_AMOUNT
    expect(potAfter === 0n || potAfter === TICKET_AMOUNT).to.be.true;
  });
});