import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8fe5d5ab detection", function () {
  it("should detect mutant that changes random == 0 to true by verifying bank receives fee", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play twice to increase probability of bank receiving fee in original
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    
    await instance.connect(player).play({ value: TICKET_AMOUNT });
    await instance.connect(player).play({ value: TICKET_AMOUNT });

    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    const bankReceivedFee = finalBankBalance > initialBankBalance;

    // In the mutant, bank never receives fee (condition always true, so player always wins)
    // In the original, bank receives fee when random == 0 (approximately 75% chance over 2 plays)
    // This test will fail on the mutant because bank never gets fee
    expect(bankReceivedFee).to.be.true;
  });
});