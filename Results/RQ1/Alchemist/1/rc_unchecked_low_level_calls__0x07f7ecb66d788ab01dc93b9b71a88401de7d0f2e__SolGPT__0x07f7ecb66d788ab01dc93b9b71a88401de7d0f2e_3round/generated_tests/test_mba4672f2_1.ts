import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - mba4672f2", function () {
  it("should revert when sending exact betLimit amount due to mutant adding +1 to msg.value comparison", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Constructor arguments: whaleAddress, wagerLimit
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1.0"); // 1 ETH bet limit
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public (onlyOwner modifier)
    await instance.connect(owner).OpenToThePublic();
    
    // In the mutant: require(msg.value + 1 == betLimit)
    // Sending exactly betLimit (1 ETH) will fail because 1 ETH + 1 != 1 ETH
    // The mutant expects msg.value = betLimit - 1 (0.999... ETH)
    await expect(
      instance.connect(player).wager({ value: wagerLimit })
    ).to.be.reverted;
  });
});