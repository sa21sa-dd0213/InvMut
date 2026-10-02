import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m39bdf76a", function () {
  it("should revert when play() is called in the same block as wager() (original behavior)", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    
    // Deploy with whale address and bet limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens the game to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player sends wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();
    
    // Attempt to play in the same block - should revert because blockNumber == block.number
    // In the mutant this would succeed (<=), in original it reverts (<)
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});