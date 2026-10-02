import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with array of length 1 due to off-by-one error in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Fund addr1 with tokens and approve the airdrop contract
    await token.transfer(addr1.address, ethers.parseEther("1000"));
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Have addr1 approve the airdrop contract to spend tokens
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Create array with exactly one recipient
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");

    // This should succeed on original (loop runs once) but fail on mutant (loop tries to access _tos[1])
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});