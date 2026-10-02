import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m8005f526", function () {
  it("should revert when wager is called with msg.value equal to betLimit (mutant expects msg.value+1)", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = ethers.Wallet.createRandom().address;
    
    // Deploy contract
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player calls wager with msg.value exactly equal to betLimit
    // Original: require(msg.value == betLimit) -> passes
    // Mutant: require(msg.value + 1 == betLimit) -> fails because 1 + 1 != 1
    await expect(
      instance.connect(player).wager({ value: betLimit })
    ).to.be.reverted;
  });
});