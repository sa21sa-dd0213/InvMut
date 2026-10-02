import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test", function () {
  it("should succeed with valid vs array length > 0 (kills mutant where require(vs.length < 0) always reverts)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address for transferFrom
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test", "TST");
    await token.waitForDeployment();

    // Mint tokens to owner and approve the AirDropContract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Create valid arrays with at least one element (vs.length > 0)
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("10")];

    // This call should succeed on original (vs.length > 0 passes)
    // On mutant, require(vs.length < 0) will always revert because uint can't be < 0
    await expect(
      instance.transfer(await token.getAddress(), recipients, amounts)
    ).to.not.be.reverted;
  });
});