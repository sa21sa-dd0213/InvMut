import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection", function () {
  it("should revert when vs array is empty but tos array is not empty (detect >= vs > mutation)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy AirDropContract
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: deploy a simple ERC20-like contract that has transferFrom
    // We need a token contract to call transferFrom on
    const TokenFactory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the AirDropContract to spend them
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Prepare test data: tos has 2 addresses, vs is empty
    const tos = [addr1.address, addr2.address];
    const vs: number[] = []; // Empty vs array - explicitly typed as number[]

    // This should revert on original (vs.length > 0 fails) but pass on mutant (vs.length >= 0 passes)
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});