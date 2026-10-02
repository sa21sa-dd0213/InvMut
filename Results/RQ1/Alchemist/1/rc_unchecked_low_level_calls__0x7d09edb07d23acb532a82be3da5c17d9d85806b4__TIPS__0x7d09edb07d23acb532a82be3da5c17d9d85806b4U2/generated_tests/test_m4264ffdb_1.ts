import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m4264ffdb", function () {
  it("should revert when calling play() in the same block as wager()", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    
    // Deploy with constructor arguments: whale address and wager limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens the game to public
    await (await instance.OpenToThePublic()).wait();
    
    // Player sends a wager
    await (await instance.connect(player).wager({ value: betLimit })).wait();
    
    // Attempt to play in the same block - should revert in original, pass in mutant
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});