import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m99849d95 by checking return value of transfer is true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as caddress
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint some tokens to owner and approve the airPort contract to transfer
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Call transfer with valid parameters expecting true return
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("10");
    
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      value
    );
    const receipt = await tx.wait();

    // The return value should be true - this will fail on mutant which returns false
    expect(await instance.connect(owner).callStatic.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      value
    )).to.equal(true);
  });
});