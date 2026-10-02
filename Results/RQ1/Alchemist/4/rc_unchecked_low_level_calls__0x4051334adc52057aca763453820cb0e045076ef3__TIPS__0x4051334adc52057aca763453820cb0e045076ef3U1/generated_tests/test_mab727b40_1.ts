import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array has one element (mutant changes > to <, so require(_tos.length < 0) always fails)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve the airdrop contract to spend them
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with one recipient - should fail on mutant because require(_tos.length < 0) always reverts
    await expect(
      instance.transfer(
        addr1.address,
        await token.getAddress(),
        [addr2.address],
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});