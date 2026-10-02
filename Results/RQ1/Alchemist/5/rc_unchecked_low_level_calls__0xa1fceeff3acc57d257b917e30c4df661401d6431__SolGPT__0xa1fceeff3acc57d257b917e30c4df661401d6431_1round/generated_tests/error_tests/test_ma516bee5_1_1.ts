import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract - Kill mutant ma516bee5 (== replaced with >=)", function () {
  it("should revert when tos.length > vs.length (original behavior), but mutant would pass", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use for transferFrom testing
    const TokenFactory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the AirDropContract to transferFrom
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Create arrays where tos.length > vs.length (3 recipients, 2 amounts)
    const recipients = [addr1.address, addr2.address, owner.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // This should revert on the original contract because tos.length != vs.length
    // The mutant with >= would NOT revert, thus failing the test
    await expect(
      instance.connect(owner).transfer(await token.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});