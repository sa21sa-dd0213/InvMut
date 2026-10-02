import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m9e738893 test", function () {
  it("should detect the mutant that emits msg.value-1 instead of msg.value in Wager event", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    
    // Deploy with whale address and bet limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player wagers exactly betLimit
    const wagerAmount = betLimit;
    const tx = await instance.connect(player).wager({ value: wagerAmount });
    const receipt = await tx.wait();
    
    // Check that the Wager event was emitted with the correct msg.value
    await expect(tx)
      .to.emit(instance, "Wager")
      .withArgs(wagerAmount, player.address);
  });
});