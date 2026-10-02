import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m7af7d5c1 - onlyPlayers modifier", function () {
  it("should revert when calling play() after a valid wager because the mutant requires wagers[msg.sender] < 0 which is impossible", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the game to the public (onlyOwner)
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Player makes a valid wager - this sets wagers[player] = betLimit > 0
    await (await instance.connect(player).wager({ value: betLimit })).wait();
    
    // Attempt to play - the mutant requires wagers[msg.sender] < 0
    // Since wagers[player] is positive (1 ether), the require fails and reverts
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
    
    // Note: In the original contract, play() would succeed (or proceed to game logic)
    // In the mutant, it always reverts because no uint256 can be < 0
  });
});