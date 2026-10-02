import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when any single transfer in the batch fails, killing mutant that removes revert()", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that can receive transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airDrop contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare recipient addresses - one of them will be a contract that rejects transfers
    const RejectingContractFactory = await ethers.getContractFactory("RejectingContract");
    const invalidReceiver = await RejectingContractFactory.deploy();
    await invalidReceiver.waitForDeployment();

    // Build recipients array with one invalid address
    const recipients = [addr1.address, await invalidReceiver.getAddress(), addr2.address];

    // This should revert because the second transfer fails
    await expect(
      instance.transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        ethers.parseEther("1"),
        18
      )
    ).to.be.reverted;
  });
});