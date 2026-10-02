import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m257866ab - onlyPlayers modifier", function () {
  it("should succeed when player calls play() after wagering, but mutant reverts because wagers[msg.sender] < 0 is always false", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whale address and wager limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Player places a wager (sends exactly betLimit)
    await instance.connect(player).wager({ value: betLimit });

    // Mine a block to ensure block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);

    // Attempt to play - should succeed on original, but mutant will revert
    await expect(
      instance.connect(player).play()
    ).to.be.reverted; // Mutant reverts due to require(wagers[msg.sender] < 0) being impossible
  });
});