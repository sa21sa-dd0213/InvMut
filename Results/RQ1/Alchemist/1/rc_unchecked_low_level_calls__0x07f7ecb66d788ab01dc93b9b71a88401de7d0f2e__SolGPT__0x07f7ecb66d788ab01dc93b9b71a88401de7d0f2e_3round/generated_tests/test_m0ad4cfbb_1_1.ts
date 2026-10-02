import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - m0ad4cfbb", function () {
  it("should revert when play() is called in the same block as wager()", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy with constructor arguments: whaleAddress and wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(player.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public (onlyOwner)
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to some value so division works
    await instance.connect(owner).AdjustDifficulty(10);

    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Attempt to play in the same block - should revert
    // The mutant removed revert(), so if it doesn't revert, the mutant is killed
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});