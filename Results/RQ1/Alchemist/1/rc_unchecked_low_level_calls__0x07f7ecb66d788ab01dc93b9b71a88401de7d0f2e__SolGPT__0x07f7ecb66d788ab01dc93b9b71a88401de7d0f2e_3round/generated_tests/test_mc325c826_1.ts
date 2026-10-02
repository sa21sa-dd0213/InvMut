import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mc325c826", function () {
  it("should reject wager with msg.value > betLimit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    const whaleAddress = owner.address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await (await instance.OpenToThePublic()).wait();
    
    // Attempt to wager with value greater than betLimit
    const overPayment = ethers.parseEther("2.0");
    await expect(
      instance.connect(addr1).wager({ value: overPayment })
    ).to.be.reverted;
  });
});