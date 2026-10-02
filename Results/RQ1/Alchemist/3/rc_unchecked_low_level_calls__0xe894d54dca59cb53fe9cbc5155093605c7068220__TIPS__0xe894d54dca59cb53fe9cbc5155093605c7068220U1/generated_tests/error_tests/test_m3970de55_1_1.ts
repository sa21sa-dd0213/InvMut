import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - m3970de55", function () {
  it("should revert when a transferFrom call fails (mutant removes revert)", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20 token that returns false on transferFrom
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Mint tokens to 'from' address and approve airDrop contract to spend them
    await token.mint(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(await airDrop.getAddress(), ethers.parseEther("10"));

    // The token contract's transferFrom will fail because we set it up to return false
    // by calling a function that makes the next transferFrom return false
    await token.setFailTransferFrom(true);

    const recipients = [to.address];
    const amount = ethers.parseEther("1");
    const decimals = 18;

    // Expect revert because the mutant removed revert() - original would revert,
    // mutant would not revert (so test passes on original, fails on mutant)
    await expect(
      airDrop.transfer(from.address, await token.getAddress(), recipients, amount, decimals)
    ).to.be.reverted;
  });
});