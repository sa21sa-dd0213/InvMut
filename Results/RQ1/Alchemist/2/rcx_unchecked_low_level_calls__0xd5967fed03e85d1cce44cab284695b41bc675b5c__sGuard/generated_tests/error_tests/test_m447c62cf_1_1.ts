import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos has one element due to mutant off-by-one error", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a token contract that will revert on transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1 so transferFrom can work
    await token.mint(addr1.address, ethers.parseEther("100"));
    // Approve the demo contract to spend tokens (though it won't be called for the extra index)
    await token.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Pass array with exactly one recipient
    const recipients = [addr2.address];

    // The mutant loop will try i=1 which is out of bounds, causing revert
    await expect(
      instance.transfer(addr1.address, token.target, recipients, ethers.parseEther("10"))
    ).to.be.reverted;
  });
});