import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8c345952 test", function () {
  it("should kill mutant by sending exactly TICKET_AMOUNT (10 wei) and expecting success, while mutant reverts", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT) - should succeed on original, revert on mutant
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0")
    });
    
    // The player sends 10 wei directly via the contract's receive/fallback? 
    // Actually, the play() function is called with value. Let's call play() properly.
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.not.be.reverted; // Original succeeds, mutant reverts (since 10 != 10 is false)
  });
});