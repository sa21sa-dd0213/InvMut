import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m084efa6c test", function () {
  it("should revert when external call fails on original but not on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airPort contract (no constructor arguments)
    const AirportFactory = await ethers.getContractFactory("airPort");
    const airport = await AirportFactory.deploy();
    await airport.waitForDeployment();

    // Deploy a simple token contract that will reject transferFrom calls
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Setup: transfer some tokens to addr1, then approve airport contract to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await airport.getAddress(), ethers.parseEther("10"));

    // The test: call transfer with a list of recipients, but with insufficient allowance for one
    const recipients = [addr2.address];
    const amount = ethers.parseEther("1000"); // More than addr1's balance/allowance

    // This should revert on the original (require(_s) fails) but might succeed on mutant
    await expect(
      airport.connect(owner).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});