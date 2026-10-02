import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant mb73ba6e6 - block.number+1 in wager", function () {
  it("should revert when calling play() in same block as wager() because mutant stores block.number+1", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Player makes a wager in the current block
    const wagerTx = await instance.connect(player).wager({ value: wagerLimit });
    await wagerTx.wait();

    // Immediately try to play in the same block - should revert on mutant
    // because timestamps[player] = block.number + 1, so blockNumber > block.number
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});