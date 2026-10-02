import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant ma7fe0d6e test", function () {
  it("should kill mutant by calling play() in the next block after wager()", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const wagerLimit = ethers.parseEther("1.0");
    
    // Deploy contract with required constructor arguments: whale address and wager limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, wagerLimit);
    await instance.waitForDeployment();
    
    // Owner opens the game to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player sends wager in block N
    const wagerTx = await instance.connect(player).wager({ value: wagerLimit });
    await wagerTx.wait();
    
    // Player tries to play in the next block (block N+1)
    // Original contract should succeed, mutant should revert
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});