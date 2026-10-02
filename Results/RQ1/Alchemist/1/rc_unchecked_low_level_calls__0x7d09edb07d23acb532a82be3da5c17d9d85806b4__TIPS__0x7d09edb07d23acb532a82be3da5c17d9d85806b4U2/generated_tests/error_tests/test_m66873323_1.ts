import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - constructor onlyRealPeople modifier", function () {
  it("should revert when deploying from a contract (msg.sender != tx.origin) if onlyRealPeople modifier is present", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a helper contract that will deploy PoCGame from its constructor
    // This simulates msg.sender being a contract address while tx.origin is an EOA
    const DeployerFactory = await ethers.getContractFactory(
      "contract Deployer { constructor(address whaleAddress, uint256 wagerLimit) { new PoCGame(whaleAddress, wagerLimit); } }"
    );
    
    // Get the PoCGame factory to link it
    const PoCGameFactory = await ethers.getContractFactory("PoCGame");
    const PoCGameBytecode = PoCGameFactory.bytecode;
    
    // Create deployer contract that references PoCGame
    const DeployerWithPoCGame = await ethers.getContractFactory(
      `contract Deployer { constructor(address whaleAddress, uint256 wagerLimit) { bytes memory bytecode = hex"${PoCGameBytecode.slice(2)}"; address addr; assembly { addr := create(0, add(bytecode, 0x20), mload(bytecode)) } require(addr != address(0), "Deploy failed"); } }`
    );
    
    // Attempt to deploy from a contract - this should revert in original (onlyRealPeople)
    // but might succeed in mutant (without modifier)
    await expect(
      DeployerWithPoCGame.deploy(addr1.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
  
  it("should deploy successfully from EOA (normal deployment)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("1"));
    await instance.waitForDeployment();
    expect(await instance.ethBalance()).to.equal(0);
  });
});