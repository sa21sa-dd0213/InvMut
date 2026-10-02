import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant test - m2b27b216", function () {
  it("should not revert when external transferFrom call succeeds, but mutant always reverts", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20 token that will be used for the transferFrom call
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Mint tokens to 'from' address and approve airDrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(airDrop.target, mintAmount);

    // Prepare parameters for transfer function
    const recipients = [to.address];
    const transferAmount = ethers.parseEther("10");
    const decimals = 18;

    // This call should succeed on the original contract (transferFrom works)
    // but will revert on the mutant because condition is always true
    await expect(
      airDrop.connect(owner).transfer(
        from.address,
        token.target,
        recipients,
        transferAmount,
        decimals
      )
    ).to.not.be.reverted;
  });
});