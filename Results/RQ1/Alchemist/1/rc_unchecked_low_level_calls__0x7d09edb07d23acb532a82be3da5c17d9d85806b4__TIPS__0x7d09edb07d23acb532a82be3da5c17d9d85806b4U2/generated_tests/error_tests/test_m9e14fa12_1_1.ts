import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m9e14fa12 detection test", function () {
  it("should revert when play() is called in the same block as wager(), detecting the mutant that stores block.number-1", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with constructor arguments: whale address and bet limit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public (only owner)
    await instance.connect(owner).OpenToThePublic();

    // Player sends exactly betLimit as wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Attempt to play in the same block - should revert with original code
    // but mutant would incorrectly allow it
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});