import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant me59dbaab test", function () {
  it("should detect mutant by testing transfer with exact pot balance", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Player buys a ticket - pot becomes 10 wei
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get the pot amount
    const pot = await instance.pot();

    // Check contract balance equals pot exactly (no extra ETH)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(pot);

    // Now simulate the win condition - this will fail on mutant because it tries to send pot + FEE_AMOUNT
    // but contract only has pot balance
    await expect(
      instance.connect(player).play({ value: ethers.parseEther("10") })
    ).to.be.reverted;
  });
});