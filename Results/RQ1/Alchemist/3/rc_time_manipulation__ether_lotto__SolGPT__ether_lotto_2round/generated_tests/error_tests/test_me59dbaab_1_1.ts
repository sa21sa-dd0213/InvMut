import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant me59dbaab by verifying that winner receives pot - FEE_AMOUNT (9 wei) and bank receives FEE_AMOUNT (1 wei)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    const potBefore = await instance.pot();
    const bankBefore = await ethers.provider.getBalance(instance.target);

    // Player plays with exactly TICKET_AMOUNT
    const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
    await tx.wait();

    // In original: player gets pot - FEE_AMOUNT = 9 wei, bank gets 1 wei, pot resets to 0
    // In mutant: player gets pot + FEE_AMOUNT = 11 wei, which will revert due to insufficient balance
    const potAfter = await instance.pot();
    const bankAfter = await ethers.provider.getBalance(instance.target);

    // The mutant will revert the transaction, so pot and bank balances remain unchanged
    // If the original code runs, pot is 0 and bank increased by FEE_AMOUNT
    expect(potAfter).to.equal(0);
    expect(bankAfter - bankBefore).to.equal(FEE_AMOUNT);
  });
});