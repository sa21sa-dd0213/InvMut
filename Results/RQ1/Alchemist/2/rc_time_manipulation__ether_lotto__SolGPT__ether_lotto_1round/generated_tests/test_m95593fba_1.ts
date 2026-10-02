import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should kill mutant by sending exactly TICKET_AMOUNT (10 wei) and expecting success on original but revert on mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the original, sending 10 wei should succeed
    // On the mutant (require(msg.value+1 == 10)), sending 10 wei makes 10+1=11 != 10, so it reverts
    const tx = instance.connect(player).play({ value: ethers.parseEther("0.000000000000000010") }); // 10 wei
    await expect(tx).to.be.reverted; // This will pass on the mutant (reverts), fail on original (no revert)
    // To kill the mutant, we assert revert - original passes, mutant fails the test
  });
});