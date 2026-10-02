import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m7db7addf test", function () {
  it("should revert when loop exceeds array bounds (i <= tos.length)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens on behalf of owner
    const amount = ethers.parseEther("10");
    await token.approve(await instance.getAddress(), amount);

    // Fund addr1 with tokens via transferFrom
    const tos = [await addr1.getAddress()];
    const vs = [amount];

    // The original contract would succeed with i < tos.length (0 < 1)
    // The mutant uses i <= tos.length (0 <= 1, then 1 <= 1) causing out-of-bounds
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});