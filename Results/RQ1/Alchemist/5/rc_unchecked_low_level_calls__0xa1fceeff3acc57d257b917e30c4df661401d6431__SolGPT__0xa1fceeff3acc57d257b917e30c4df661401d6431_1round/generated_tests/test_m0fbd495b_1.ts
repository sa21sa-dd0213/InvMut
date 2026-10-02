import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should kill mutant m0fbd495b by calling transfer with vs.length > 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // We need a contract that implements transferFrom for the call to succeed
    // Deploy a simple ERC20-like token for testing
    const TokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Prepare arrays with vs.length = 1 (which is > 0, should pass on original)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("100")];

    // On the original contract, this call should succeed
    // On the mutant, require(vs.length < 0) will always revert because vs.length is unsigned and cannot be < 0
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});