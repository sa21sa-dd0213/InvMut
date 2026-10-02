import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant kill test", function () {
  it("should return true when transfer succeeds - kills mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Setup: owner mints tokens and approves airdrop contract to transferFrom
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(await airdrop.getAddress(), mintAmount);

    const transferAmount = ethers.parseEther("10");
    const recipients = [addr2.address];

    // Execute transfer
    const tx = await airdrop.transfer(addr1.address, await token.getAddress(), recipients, transferAmount);
    const result = await tx.wait();

    // Assert return value is true (original behavior)
    // The mutant returns false by default since return true is removed
    expect(result).to.not.be.undefined;

    // Get the return value from the transaction
    const returnValue = await airdrop.callStatic.transfer(addr1.address, await token.getAddress(), recipients, transferAmount);
    expect(returnValue).to.equal(true);
  });
});