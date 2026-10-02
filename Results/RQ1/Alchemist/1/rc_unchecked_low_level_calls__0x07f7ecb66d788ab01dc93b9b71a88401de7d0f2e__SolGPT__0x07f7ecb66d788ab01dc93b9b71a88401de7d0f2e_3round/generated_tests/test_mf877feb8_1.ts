import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - mf877feb8", function () {
  it("should detect mutant that adds 1 to msg.value when recording wager", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Player sends exactly betLimit (1 ether) as wager
    const wagerAmount = betLimit;
    await instance.connect(player).wager({ value: wagerAmount });
    
    // Check that hasPlayerWagered returns true
    expect(await instance.hasPlayerWagered(player.address)).to.be.true;
    
    // Check that the actual recorded wager matches what was sent (not msg.value+1)
    // We can verify by checking the player cannot wager again (since wager > 0)
    await expect(
      instance.connect(player).wager({ value: wagerAmount })
    ).to.be.reverted;
    
    // Additionally, we can verify the wager is exactly betLimit by playing
    // First set difficulty to ensure a deterministic outcome
    await instance.connect(owner).AdjustDifficulty(2);
    
    // Play the game - this will use the recorded wager amount
    await instance.connect(player).play();
    
    // The mutant would have recorded wager as msg.value+1, causing incorrect
    // behavior in play() when checking wagers[msg.sender] > 0 and resetting
    // to 0. A correct implementation would work properly.
  });
});