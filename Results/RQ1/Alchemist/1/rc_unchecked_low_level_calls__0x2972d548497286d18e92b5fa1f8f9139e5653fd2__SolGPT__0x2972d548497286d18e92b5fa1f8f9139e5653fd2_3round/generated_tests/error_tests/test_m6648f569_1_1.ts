import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m6648f569 test", function () {
  it("should kill mutant by verifying sha256 replacement causes revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token that implements transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund addr1 with tokens and approve the demo contract to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare call parameters: from=addr1, caddress=token, recipients=[addr2], values=[10]
    const recipients = [addr2.address];
    const values = [ethers.parseEther("10")];

    // This call should succeed on the original contract (using keccak256 selector)
    // but fail on the mutant because sha256 produces a different selector
    await expect(
      instance.transfer(addr1.address, await token.getAddress(), recipients, values)
    ).to.be.reverted;
  });
});